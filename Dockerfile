FROM continuumio/miniconda3:latest

SHELL ["/bin/bash", "-lc"]
WORKDIR /issue

COPY . /issue/

RUN conda env create -f /issue/environment.yml
RUN source /opt/conda/etc/profile.d/conda.sh && \
    conda activate recharts-waterfall && \
    bash /issue/reproduce.sh

CMD ["bash", "-lc", "source /opt/conda/etc/profile.d/conda.sh && conda activate recharts-waterfall && bash /issue/run-tests.sh"]
